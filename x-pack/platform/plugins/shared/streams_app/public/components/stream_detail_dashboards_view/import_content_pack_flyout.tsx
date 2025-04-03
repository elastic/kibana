/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { ContentPack, ContentPackObject } from '@kbn/content-packs-schema';
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
import { ContentPackObjectsList, includeReferences } from './content_pack_objects_list';

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
  const [contentPack, setContentPack] = useState<ContentPack | undefined>();
  const [contentPackObjects, setContentPackObjects] = useState<ContentPackObject[]>([]);
  const [selectedContentPackObjects, setSelectedContentPackObjects] = useState<ContentPackObject[]>(
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
          onChange={(files) => {
            if (files?.length) {
              const contentFile = files.item(0);
              if (!contentFile) return;

              setFile(contentFile);

              contentFile.text().then((text: string) => {
                const parsedContentPack = JSON.parse(text);
                const objects: ContentPackObject[] = parsedContentPack.content
                  .split('\n')
                  .map((line: string) => JSON.parse(line));

                setContentPack(parsedContentPack);
                setContentPackObjects(objects);
              });
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
              disabled={!file || !selectedContentPackObjects.length}
              isLoading={isLoading}
              fill
              onClick={() => {
                if (!file) return;

                setIsLoading(true);

                const body = new FormData();
                body.append(
                  'content',
                  new File(
                    [
                      JSON.stringify({
                        ...contentPack,
                        content: includeReferences(contentPackObjects, selectedContentPackObjects)
                          .map((object) => JSON.stringify(object))
                          .join('\n'),
                      }),
                    ],
                    'content.json',
                    { type: 'application/json' }
                  )
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
