/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FilterStreamGetResponse, getParentId } from '@kbn/streams-schema';
import { EuiButton, EuiConfirmModal } from '@elastic/eui';
import { useAbortController } from '@kbn/react-hooks';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { RedirectTo } from '../../redirect_to';
import { useKibana } from '../../../hooks/use_kibana';
import { Wrapper } from './wrapper';
import { RoutingConditionEditor } from '../condition_editor';

function MangeFilterStream({
  definition,
  refreshDefinition,
}: {
  definition: FilterStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const router = useStreamsAppRouter();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [condition, setCondition] = useState(definition.stream.filter.filter);

  const { signal } = useAbortController();

  async function deleteFilterStream(name: string) {
    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: {
        path: {
          name,
        },
      },
      signal,
    });
    refreshDefinition();
    setIsDeleteModalOpen(false);

    router.push('/{key}', {
      path: { key: getParentId(definition.stream.name) ?? 'logs' },
      query: {},
    });

    // For some reason this throws errors because the page still tries to load the old definition?
  }

  async function updateFilterStream() {
    await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_filter 2023-10-31', {
      params: {
        path: {
          name: definition.stream.name,
        },
        body: {
          filter: {
            filter: condition,
            source: definition.stream.filter.source,
          },
        },
      },
      signal,
    });
  }

  const destroyModalTitleId = 'destroyFilterStreamModal';

  return (
    <div>
      <RoutingConditionEditor condition={condition} onConditionChange={setCondition} />
      <EuiButton color="primary" onClick={() => updateFilterStream()}>
        Save
      </EuiButton>
      <EuiButton color="danger" onClick={() => setIsDeleteModalOpen(true)}>
        Delete
      </EuiButton>
      {isDeleteModalOpen && (
        <EuiConfirmModal
          aria-labelledby={destroyModalTitleId}
          title="Delete filter stream?"
          titleProps={{ id: destroyModalTitleId }}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => deleteFilterStream(definition.stream.name)}
          cancelButtonText="Keep stream"
          confirmButtonText="Delete stream"
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>The filter stream will be removed but no data will be deleted.</p>
        </EuiConfirmModal>
      )}
    </div>
  );
}

export function FilterStreamDetailManagement({
  definition,
  refreshDefinition,
}: {
  definition: FilterStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}');

  const tabs = {
    filter: {
      content: <MangeFilterStream definition={definition} refreshDefinition={refreshDefinition} />,
      label: i18n.translate('xpack.streams.streamDetailView.routingTab', {
        defaultMessage: 'Filter',
      }),
    },
  };

  if (tab !== 'filter') {
    return <RedirectTo path="/{key}/management/{tab}" params={{ path: { key, tab: 'filter' } }} />;
  }

  return <Wrapper tabs={tabs} streamId={key} tab={tab} />;
}
