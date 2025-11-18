/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CSSProperties, FunctionComponent } from 'react';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiButtonEmpty,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';

import type { Document } from '../../../types';

import type { TestPipelineFlyoutTab } from '../test_pipeline_tabs';

const i18nTexts = {
  dropdownLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsdropdown.dropdownLabel',
    {
      defaultMessage: 'Documents:',
    }
  ),
  editDocumentsButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsDropdown.editDocumentsButtonLabel',
    {
      defaultMessage: 'Edit documents',
    }
  ),
  popoverTitle: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.documentsDropdown.popoverTitle',
    {
      defaultMessage: 'Test documents',
    }
  ),
};

interface Props {
  documents: Document[];
  selectedDocumentIndex: number;
  updateSelectedDocument: (index: number) => void;
  openFlyout: (activeFlyoutTab: TestPipelineFlyoutTab) => void;
}

const panelStyle = { minWidth: '200px' } satisfies CSSProperties;

export const DocumentsDropdown: FunctionComponent<Props> = ({
  documents,
  selectedDocumentIndex,
  updateSelectedDocument,
  openFlyout,
}) => {
  const [showPopover, setShowPopover] = useState(false);

  const managePipelineButton = (
    <EuiButtonEmpty
      data-test-subj="documentsButton"
      onClick={() => setShowPopover((previousBool) => !previousBool)}
      iconType="arrowDown"
      iconSide="right"
    >
      {i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.selectedDocumentLabel', {
        defaultMessage: 'Document {selectedDocument}',
        values: {
          selectedDocument: selectedDocumentIndex + 1,
        },
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      button={managePipelineButton}
      panelPaddingSize="none"
      repositionOnScroll
      data-test-subj="documentsDropdown"
      panelStyle={panelStyle}
    >
      <EuiSelectable
        singleSelection
        data-test-subj="documentList"
        options={documents.map((doc, index) => ({
          key: index.toString(),
          'data-test-subj': 'documentListItem',
          checked: selectedDocumentIndex === index ? 'on' : undefined,
          label: i18n.translate('xpack.ingestPipelines.pipelineEditor.testPipeline.documentLabel', {
            defaultMessage: 'Document {documentNumber}',
            values: {
              documentNumber: index + 1,
            },
          }),
        }))}
        onChange={(newOptions) => {
          const selectedOption = newOptions.find((option) => option.checked === 'on');
          if (selectedOption) {
            updateSelectedDocument(Number(selectedOption.key!));
          }

          setShowPopover(false);
        }}
      >
        {(list) => (
          <>
            <EuiPopoverTitle paddingSize="s">{i18nTexts.popoverTitle}</EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>

      <EuiPopoverFooter paddingSize="s">
        <EuiButton
          size="s"
          fullWidth
          onClick={() => {
            openFlyout('documents');
            setShowPopover(false);
          }}
          data-test-subj="editDocumentsButton"
        >
          {i18nTexts.editDocumentsButtonLabel}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
