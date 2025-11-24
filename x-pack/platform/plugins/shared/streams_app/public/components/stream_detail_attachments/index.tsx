/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { useAttachmentsApi } from '../../hooks/use_attachments_api';
import { useAttachmentsFetch } from '../../hooks/use_attachments_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { AddAttachmentFlyout } from './add_attachment_flyout';
import { AttachmentsTable } from './attachment_table';

export function StreamDetailAttachments({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const [query, setQuery] = useState('');

  const [isAddAttachmentFlyoutOpen, setIsAddAttachmentFlyoutOpen] = useState(false);

  const attachmentsFetch = useAttachmentsFetch({
    name: definition.stream.name,
  });
  const { addAttachments, removeAttachments } = useAttachmentsApi({
    name: definition.stream.name,
  });

  const [isUnlinkLoading, setIsUnlinkLoading] = useState(false);
  const linkedAttachments = useMemo(() => {
    return attachmentsFetch.value?.attachments ?? [];
  }, [attachmentsFetch.value?.attachments]);

  const filteredAttachments = useMemo(() => {
    return linkedAttachments.filter((attachment) => {
      return attachment.title.toLowerCase().includes(query.toLowerCase());
    });
  }, [linkedAttachments, query]);

  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);

  const {
    core: {
      application: {
        capabilities: {
          streams: { [STREAMS_UI_PRIVILEGES.manage]: canLinkAttachments },
        },
      },
    },
  } = useKibana();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {selectedAttachments.length > 0 && (
            <EuiButton
              data-test-subj="streamsAppStreamDetailRemoveAttachmentButton"
              iconType="trash"
              isLoading={isUnlinkLoading}
              onClick={async () => {
                try {
                  setIsUnlinkLoading(true);

                  await removeAttachments(selectedAttachments);
                  attachmentsFetch.refresh();

                  setSelectedAttachments([]);
                } finally {
                  setIsUnlinkLoading(false);
                }
              }}
              color="danger"
            >
              {i18n.translate(
                'xpack.streams.streamDetailAttachmentView.removeSelectedButtonLabel',
                {
                  defaultMessage: 'Unlink selected',
                }
              )}
            </EuiButton>
          )}
          <EuiSearchBar
            query={query}
            box={{
              incremental: true,
            }}
            onChange={(nextQuery) => {
              setQuery(nextQuery.queryText);
            }}
          />
          <EuiButton
            data-test-subj="streamsAppStreamDetailAddAttachmentButton"
            iconType="plusInCircle"
            disabled={!canLinkAttachments}
            onClick={() => {
              setIsAddAttachmentFlyoutOpen(true);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailAttachmentView.addAnAttachmentButtonLabel', {
              defaultMessage: 'Add an attachment',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <AttachmentsTable
          entityId={definition?.stream.name}
          attachments={filteredAttachments}
          loading={attachmentsFetch.loading}
          selectedAttachments={selectedAttachments}
          setSelectedAttachments={canLinkAttachments ? setSelectedAttachments : undefined}
          dataTestSubj="streamsAppStreamDetailAttachmentsTable"
        />
        {definition && isAddAttachmentFlyoutOpen ? (
          <AddAttachmentFlyout
            linkedAttachments={linkedAttachments}
            entityId={definition.stream.name}
            onAddAttachments={async (attachments) => {
              await addAttachments(attachments);
              attachmentsFetch.refresh();
              setIsAddAttachmentFlyoutOpen(false);
            }}
            onClose={() => {
              setIsAddAttachmentFlyoutOpen(false);
            }}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
