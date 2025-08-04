/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import React, { useCallback } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { i18n } from '@kbn/i18n';

export function Suggestions({
  definition,
  onPackageExport,
}: {
  definition: Streams.WiredStream.GetResponse;
  onPackageExport: (file: File) => void;
}) {
  const {
    core: { http },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [isExporting, setIsExporting] = React.useState(false);

  const { value: suggestionsResponse, loading: isLoadingSuggestions } = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition) {
        return;
      }

      const suggestions = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/content/suggest',
        { params: { path: { name: definition.stream.name } }, signal }
      );
      return { suggestions };
    },
    [definition, streamsRepositoryClient]
  );

  const exportPackage = useCallback(
    async (packageName: string) => {
      const raw = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/content/package/{package}/export',
        {
          params: {
            path: { name: definition.stream.name, package: packageName },
          },
          signal: new AbortController().signal,
        }
      );

      return new File([raw], `${packageName}.zip`, { type: 'application/zip' });
    },
    [http, definition, streamsRepositoryClient]
  );

  return (
    <>
      <EuiText size="m">
        <b>
          {i18n.translate('xpack.streams.content.suggestions.title', {
            defaultMessage: 'Suggestions',
          })}
        </b>
      </EuiText>

      <EuiSpacer size="s" />

      {isLoadingSuggestions ? (
        <EuiLoadingSpinner />
      ) : (
        suggestionsResponse?.suggestions.map((suggestion) => (
          <>
            <EuiFlexGroup key={suggestion} gutterSize="m" alignItems="center">
              <EuiFlexItem grow={false}>
                <b>{suggestion}</b>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  color="text"
                  size="s"
                  isLoading={isExporting}
                  isDisabled={isExporting}
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      const file = await exportPackage(suggestion);
                      onPackageExport(file);
                    } catch (error) {
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                >
                  Preview
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />
          </>
        ))
      )}
    </>
  );
}
