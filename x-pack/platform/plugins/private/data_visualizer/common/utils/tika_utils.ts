/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function isTikaType(type: string) {
  return getTikaDisplayType(type).isTikaType;
}

export const getTikaDisplayType = (type: string): { isTikaType: boolean; label: string } => {
  switch (type) {
    case 'application/doc':
    case 'application/ms-doc':
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return {
        isTikaType: true,
        label: i18n.translate('xpack.dataVisualizer.file.tikaTypes.word', {
          defaultMessage: 'Microsoft Office Word document',
        }),
      };

    case 'application/excel':
    case 'application/vnd.ms-excel':
    case 'application/x-excel':
    case 'application/x-msexcel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return {
        isTikaType: true,
        label: i18n.translate('xpack.dataVisualizer.file.tikaTypes.excel', {
          defaultMessage: 'Microsoft Office Excel document',
        }),
      };

    case 'application/mspowerpoint':
    case 'application/powerpoint':
    case 'application/vnd.ms-powerpoint':
    case 'application/x-mspowerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return {
        isTikaType: true,
        label: i18n.translate('xpack.dataVisualizer.file.tikaTypes.powerPoint', {
          defaultMessage: 'Microsoft Office Power Point document',
        }),
      };

    case 'application/vnd.oasis.opendocument.presentation':
    case 'application/vnd.oasis.opendocument.spreadsheet':
    case 'application/vnd.oasis.opendocument.text':
      return {
        isTikaType: true,
        label: i18n.translate('xpack.dataVisualizer.file.tikaTypes.openDoc', {
          defaultMessage: 'Open Document Format',
        }),
      };

    case 'text/rtf':
    case 'application/rtf':
      return {
        isTikaType: true,
        label: i18n.translate('xpack.dataVisualizer.file.tikaTypes.richText', {
          defaultMessage: 'Rich Text Format',
        }),
      };

    case 'application/pdf':
      return {
        isTikaType: true,
        label: i18n.translate('xpack.dataVisualizer.file.tikaTypes.pdf', {
          defaultMessage: 'PDF',
        }),
      };

    case 'text/plain':
    case 'text/plain; charset=UTF-8':
      return {
        isTikaType: true,
        label: i18n.translate('xpack.dataVisualizer.file.tikaTypes.plainText', {
          defaultMessage: 'Plain text',
        }),
      };

    default:
      return { isTikaType: false, label: type };
  }
};
