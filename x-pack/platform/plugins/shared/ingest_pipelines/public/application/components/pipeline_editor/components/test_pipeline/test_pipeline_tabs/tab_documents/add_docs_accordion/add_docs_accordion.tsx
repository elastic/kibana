/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiAccordion, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';

import { useKibana } from '../../../../../../../../shared_imports';
import { useIsMounted } from '../../../../../use_is_mounted';
import { AddDocumentForm } from '../add_document_form';

import './add_docs_accordion.scss';

const i18nTexts = {
  addDocumentsButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.addDocumentsButtonLabel',
    {
      defaultMessage: 'Add a test document from an index',
    }
  ),
  addDocumentsDescription: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.contentDescriptionText',
    {
      defaultMessage: `Provide the document's index and document ID.`,
    }
  ),
};

interface Props {
  onAddDocuments: (document: any) => void;
}

export const AddDocumentsAccordion: FunctionComponent<Props> = ({ onAddDocuments }) => {
  const { services } = useKibana();
  const isMounted = useIsMounted();
  const [discoverLink, setDiscoverLink] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getDiscoverUrl = async (): Promise<void> => {
      const locator = services.share?.url.locators.get('DISCOVER_APP_LOCATOR');
      if (!locator) {
        setDiscoverLink(undefined);
        return;
      }
      const discoverUrl = await locator.getUrl({ indexPatternId: undefined });
      if (!isMounted.current) return;
      setDiscoverLink(discoverUrl);
    };

    getDiscoverUrl();
  }, [isMounted, services.share]);

  return (
    <EuiAccordion
      id="addDocumentsAccordion"
      buttonContent={i18nTexts.addDocumentsButton}
      paddingSize="s"
      data-test-subj="addDocumentsAccordion"
    >
      <div className="addDocumentsAccordion">
        <EuiText size="s" color="subdued">
          <p>
            {i18nTexts.addDocumentsDescription}
            {discoverLink && (
              <>
                {' '}
                <FormattedMessage
                  id="xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.discoverLinkDescriptionText"
                  defaultMessage="To explore your existing data, use {discoverLink}."
                  values={{
                    discoverLink: (
                      <EuiLink href={discoverLink} target="_blank" external>
                        Discover
                      </EuiLink>
                    ),
                  }}
                />
              </>
            )}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <AddDocumentForm onAddDocuments={onAddDocuments} />
      </div>
    </EuiAccordion>
  );
};
