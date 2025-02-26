/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { compressToEncodedURIComponent } from 'lz-string';

import {
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiCodeBlock,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { BatchReindexApiDocsLink } from '../es_deprecations';
import { useAppContext } from '../../../app_context';

interface Props {
  indices: Set<string>;
}

const getBulkReindexConsoleCommand = (indices: Set<string>) => {
  const sourceIndices = Array.from(indices)
    .map((index) => `"${index}"`)
    .join(',\n    ');

  return `POST kbn:api/upgrade_assistant/reindex/batch
{
  "indexNames": [
    ${sourceIndices}
  ]
}
  `;
};

export const BulkReindexModal: FunctionComponent<Props> = ({ indices }) => {
  const {
    application,
    plugins: { share },
    services: {
      core: { docLinks },
    },
  } = useAppContext();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const consoleRequest = useMemo(() => getBulkReindexConsoleCommand(indices), [indices]);

  const modalTitleId = useGeneratedHtmlId();

  const getUrlParams = undefined;
  const canShowDevtools = !!application?.capabilities?.dev_tools?.show;
  const devToolsDataUri = compressToEncodedURIComponent(consoleRequest);

  // Generate a console preview link if we have a valid locator
  const consolePreviewLink = share?.url?.locators.get('CONSOLE_APP_LOCATOR')?.useUrl(
    {
      loadFrom: `data:text/plain,${devToolsDataUri}`,
    },
    getUrlParams,
    [consoleRequest]
  );

  const shouldShowDevToolsLink = canShowDevtools && consolePreviewLink !== undefined;

  return (
    <>
      <EuiButton onClick={showModal} fill>
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.bulkReindex.ctaButtonLabel"
          defaultMessage="Batch reindex"
        />
      </EuiButton>
      {isModalVisible && (
        <EuiModal aria-labelledby={modalTitleId} onClose={closeModal} style={{ width: 800 }}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.bulkReindexModal.title"
                defaultMessage="Resolve with batch reindexing?"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.bulkReindexModal.description"
              defaultMessage="You can use a single call to the {docsLink} to update multiple indices that have compatibility issues with the version you're preparing to upgrade to. Based on the issues you selected, several indices can be reindexed using the following Console command:"
              values={{
                docsLink: <BatchReindexApiDocsLink docLinks={docLinks} />,
              }}
            />
            <EuiSpacer />
            <EuiCodeBlock language="json" isCopyable overflowHeight={250}>
              {consoleRequest}
            </EuiCodeBlock>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.bulkReindexModal.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
            {shouldShowDevToolsLink && (
              <EuiButton
                fill
                iconType="wrench"
                href={consolePreviewLink}
                data-test-subj="openInConsoleButton"
              >
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.bulkReindexModal.openInConsoleButtonLabel"
                  defaultMessage="Open in Console"
                />
              </EuiButton>
            )}
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
