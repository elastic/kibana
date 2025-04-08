/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { ContentPack, ContentPackEntry } from '@kbn/content-packs-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { ContentPackObjectsList } from './content_pack_objects_list';

export function ImportContentPackFlyout({
  definition,
  onImport,
  onClose,
}: {
  definition: IngestStreamGetResponse;
  onClose: () => void;
  onImport: () => void;
}) {
  const {
    core: { http },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [contentPackObjects, setContentPackObjects] = useState<ContentPackEntry[]>([]);
  const [selectedContentPackObjects, setSelectedContentPackObjects] = useState<ContentPackEntry[]>(
    []
  );

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.streamDetailDashboard.importContent', {
              defaultMessage: 'Import content pack',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFilePicker
          id={'streams-content-import'}
          multiple={false}
          initialPromptText="Select a streams content file"
          fullWidth
          onChange={async (files) => {
            if (files?.length) {
              const archiveFile = files.item(0);
              if (!archiveFile) return;

              setFile(archiveFile);

              const body = new FormData();
              body.append('content', archiveFile);

              const contentPackParsed = await http.post<ContentPack>(
                `/api/streams/${definition.stream.name}/content/preview`,
                {
                  body,
                  headers: {
                    // Important to be undefined, it forces proper headers to be set for FormData
                    'Content-Type': undefined,
                  },
                }
              );

              setContentPackObjects(contentPackParsed.entries);
            } else {
              setFile(null);
            }
          }}
          display={'large'}
        />

        {file ? (
          <>
            <EuiSpacer />

            <ContentPackObjectsList
              objects={contentPackObjects}
              onSelectionChange={(objects) => setSelectedContentPackObjects(objects)}
            />
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppModalFooterButton"
              disabled={!file || selectedContentPackObjects.length === 0}
              isLoading={isLoading}
              fill
              onClick={() => {
                if (!file) return;

                setIsLoading(true);

                const body = new FormData();
                body.append('content', file);
                body.append(
                  'include',
                  JSON.stringify({
                    objects: { dashboards: selectedContentPackObjects.map(({ id }) => id) },
                  })
                );

                http
                  .post(`/api/streams/${definition.stream.name}/content/import`, {
                    body,
                    headers: {
                      // Important to be undefined, it forces proper headers to be set for FormData
                      'Content-Type': undefined,
                    },
                  })
                  .then(() => {
                    setIsLoading(false);
                    setContentPackObjects([]);
                    setFile(null);
                    onImport();
                  });
              }}
            >
              {i18n.translate('xpack.streams.importContentPackFlyout.importToStream', {
                defaultMessage: 'Import to stream',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
