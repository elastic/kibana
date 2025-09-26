/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useStreamSystems } from '../../../stream_detail_significant_events_view/add_significant_event_flyout/common/use_steam_systems';
import { ConditionPanel } from '../../shared';
import { SystemEventsData } from './system_events_data';
import { useStreamSystemsApi } from '../../../../hooks/use_stream_systems_api';

export const StreamSystemDetailsFlyout = ({
  system: initialSystem,
  definition,
  closeFlyout,
}: {
  system: System | string;
  closeFlyout: () => void;
  definition: Streams.all.Definition;
}) => {
  const [system, setSystem] = React.useState<System | null>(
    typeof initialSystem === 'string' ? null : initialSystem
  );
  const [value, setValue] = React.useState('');
  const { upsertQuery } = useStreamSystemsApi(definition);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const { value: listOfSystems } = useStreamSystems(definition);

  useEffect(() => {
    if (typeof initialSystem === 'string') {
      const foundSystem = listOfSystems?.systems.find((s) => s.name === initialSystem) || null;
      setSystem(foundSystem);
      setValue(foundSystem?.description ?? '');
    } else {
      setSystem(initialSystem);
    }
  }, [definition.name, listOfSystems, initialSystem]);

  useEffect(() => {
    if (typeof initialSystem === 'string') return;
    setValue(initialSystem.description || '');
  }, [initialSystem]);

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-label={i18n.translate('xpack.streams.systemDetails.flyoutAriaLabel', {
        defaultMessage: 'System details',
      })}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{system?.name ?? 'System details'}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      {system ? (
        <>
          <EuiFlyoutBody>
            <div>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.streams.streamDetailView.systemDetailExpanded.description',
                    {
                      defaultMessage: 'Description',
                    }
                  )}
                </h3>
              </EuiTitle>
              <EuiMarkdownEditor
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailView.systemDetailExpanded.markdownEditorAriaLabel',
                  {
                    defaultMessage: 'System description markdown editor',
                  }
                )}
                value={value}
                onChange={setValue}
                height={400}
                readOnly={false}
                initialViewMode="viewing"
              />
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.streams.streamDetailView.systemDetailExpanded.filter', {
                    defaultMessage: 'Filter',
                  })}
                </h3>
              </EuiTitle>
              <ConditionPanel condition={system.filter} />
              <EuiSpacer size="m" />
              <SystemEventsData system={system} />
            </div>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  isLoading={isUpdating}
                  iconType="cross"
                  onClick={closeFlyout}
                  flush="left"
                  aria-label={i18n.translate('xpack.streams.systemDetails.closeButtonAriaLabel', {
                    defaultMessage: 'Close flyout',
                  })}
                >
                  <FormattedMessage
                    id="xpack.streams.systemDetails.cancelButton"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isLoading={isUpdating}
                  onClick={() => {
                    setIsUpdating(true);
                    upsertQuery(system.name, { description: value, filter: system.filter }).finally(
                      () => {
                        setIsUpdating(false);
                        closeFlyout();
                      }
                    );
                  }}
                  fill
                >
                  <FormattedMessage
                    id="xpack.streams.systemDetails.saveChanges"
                    defaultMessage="Save changes"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      ) : (
        <EuiLoadingSpinner size="xl" />
      )}
    </EuiFlyout>
  );
};
