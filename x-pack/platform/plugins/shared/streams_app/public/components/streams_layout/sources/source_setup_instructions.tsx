/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormAppend,
  EuiFormRow,
  EuiSpacer,
  EuiTabs,
  EuiTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SourceViewModel } from './types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from './source_type_config';
import { SourceEndpointField } from './source_endpoint_field';

export const SourceSetupInstructions = ({
  source,
  apiKey,
  showEndpointHelpText = true,
}: {
  source: SourceViewModel;
  apiKey?: string;
  showEndpointHelpText?: boolean;
}) => {
  const config = SOURCE_TYPE_CONFIG_BY_TYPE[source.type];
  const [selectedTabId, setSelectedTabId] = useState(config.codeTabs[0]?.id);
  const selectedTab = useMemo(
    () => config.codeTabs.find((tab) => tab.id === selectedTabId) ?? config.codeTabs[0],
    [config.codeTabs, selectedTabId]
  );
  const canShowSnippet = Boolean(source.endpoint && apiKey);
  const snippet =
    source.endpoint && apiKey ? selectedTab?.getSnippet(source.endpoint, apiKey) ?? '' : '';

  return (
    <>
      {canShowSnippet && (
        <>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.streams.sources.sendDataUsingLabel', {
              defaultMessage: 'Send data using',
            })}
          >
            <>
              <EuiTabs size="s">
                {config.codeTabs.map((tab) => (
                  <EuiTab
                    key={tab.id}
                    isSelected={selectedTab?.id === tab.id}
                    onClick={() => setSelectedTabId(tab.id)}
                    data-test-subj={`streamsSourceSetupTab-${tab.id}`}
                  >
                    {tab.label}
                  </EuiTab>
                ))}
              </EuiTabs>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="none" responsive={false}>
                <EuiFlexItem>
                  <EuiCodeBlock
                    language="yaml"
                    fontSize="s"
                    paddingSize="m"
                    isCopyable={false}
                    data-test-subj="streamsSourceSetupCodeBlock"
                  >
                    {snippet}
                  </EuiCodeBlock>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={snippet}>
                    {(copy) => (
                      <EuiFormAppend
                        element="button"
                        iconLeft="copy"
                        onClick={copy}
                        aria-label={i18n.translate(
                          'xpack.streams.sources.copySetupInstructionsAriaLabel',
                          {
                            defaultMessage: 'Copy setup instructions to clipboard',
                          }
                        )}
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          </EuiFormRow>
          <EuiSpacer size="m" />
        </>
      )}
      <SourceEndpointField
        endpoint={source.endpoint}
        endpoints={source.endpoints}
        showHelpText={showEndpointHelpText}
      />
    </>
  );
};
