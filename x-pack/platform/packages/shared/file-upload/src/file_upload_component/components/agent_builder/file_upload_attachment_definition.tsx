/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Suspense, lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiSkeletonText, EuiText } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { FileUploadAttachment, FileUploadResults } from '@kbn/file-upload-common';
import type { FileUploadStartDependencies } from '../../kibana_context';

const LazyFileUploadPanel = lazy(async () => {
  const { FileUploadPanel } = await import('./file_upload_panel');
  return { default: FileUploadPanel };
});

const FileUploadInline: FC<AttachmentRenderProps<FileUploadAttachment>> = ({ attachment }) => {
  const { origin, data } = attachment;

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <EuiText size="s" color={origin ? 'success' : 'subdued'}>
        <p data-test-subj="fileUploadAttachmentInlineText">
          {origin
            ? i18n.translate('xpack.fileUpload.agentBuilder.attachment.inlineUploaded', {
                defaultMessage: 'Data uploaded to the index {index}.',
                values: { index: origin },
              })
            : data.reason ??
              i18n.translate('xpack.fileUpload.agentBuilder.attachment.inlinePrompt', {
                defaultMessage: 'Upload a file to import its data into Elasticsearch.',
              })}
        </p>
      </EuiText>
    </EuiPanel>
  );
};

/** Creates the Agent Builder UI definition for the file upload attachment. */
export const createFileUploadAttachmentDefinition = (
  coreStart: CoreStart,
  plugins: FileUploadStartDependencies
): AttachmentUIDefinition<FileUploadAttachment> => {
  const dependencies: FileUploadStartDependencies = { ...plugins, ...coreStart, coreStart };

  return {
    getLabel: () =>
      i18n.translate('xpack.fileUpload.agentBuilder.attachment.label', {
        defaultMessage: 'File upload',
      }),
    getIcon: () => 'upload',
    getHeader: ({ attachment }) => ({
      icon: 'upload',
      subtitle: attachment.origin,
      badges: [
        attachment.origin
          ? {
              label: i18n.translate('xpack.fileUpload.agentBuilder.attachment.uploadedBadge', {
                defaultMessage: 'Uploaded',
              }),
              color: 'success',
              iconType: 'check',
            }
          : {
              label: i18n.translate('xpack.fileUpload.agentBuilder.attachment.pendingBadge', {
                defaultMessage: 'Waiting for upload',
              }),
            },
      ],
    }),
    renderInlineContent: (props) => <FileUploadInline {...props} />,
    canvasWidth: '600px',
    renderCanvasContent: ({ attachment }, { updateOrigin, closeCanvas }) => {
      const onUploadComplete = async ({ index }: FileUploadResults) => {
        try {
          const response = await updateOrigin(index);
          const [warning] = response?.warnings ?? [];
          if (warning) {
            coreStart.notifications.toasts.addWarning(warning);
          }
        } catch (error) {
          coreStart.notifications.toasts.addError(error, {
            title: i18n.translate(
              'xpack.fileUpload.agentBuilder.attachment.updateOriginErrorTitle',
              {
                defaultMessage: 'The data was uploaded, but the agent could not be told',
              }
            ),
          });
        }
      };

      return (
        <Suspense fallback={<EuiSkeletonText />}>
          <LazyFileUploadPanel
            dependencies={dependencies}
            uploadedIndex={attachment.origin}
            suggestedIndexName={attachment.data.suggested_index_name}
            onUploadComplete={onUploadComplete}
            closeCanvas={closeCanvas}
          />
        </Suspense>
      );
    },
    getActionButtons: ({ attachment, isCanvas, openCanvas }) => {
      if (isCanvas || attachment.origin || !openCanvas) {
        return [];
      }

      return [
        {
          label: i18n.translate('xpack.fileUpload.agentBuilder.attachment.uploadButton', {
            defaultMessage: 'Upload file',
          }),
          icon: 'upload',
          type: ActionButtonType.PRIMARY,
          handler: openCanvas,
        },
      ];
    },
  };
};
