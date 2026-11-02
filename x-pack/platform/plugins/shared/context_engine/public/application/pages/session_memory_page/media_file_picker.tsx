/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker, EuiFormRow, EuiIcon, EuiImage, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiFilePickerProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import type { SessionMemoryMediaItem } from '../../../../common/http_api/session_memory';
import { readMediaFile } from './media_file';

const previewAlt = i18n.translate('xpack.contextEngine.sessionMemory.media.previewAlt', {
  defaultMessage: 'Selected image preview',
});

const pdfReadyLabel = (name: string) =>
  i18n.translate('xpack.contextEngine.sessionMemory.media.pdfReady', {
    defaultMessage: 'PDF ready: {name}',
    values: { name },
  });

interface MediaFilePickerProps {
  label: string;
  helpText?: string;
  accept: string;
  /** Called with the read media item, or `undefined` when the selection is cleared or invalid. */
  onChange: (media: SessionMemoryMediaItem | undefined) => void;
  isDisabled?: boolean;
  'data-test-subj': string;
}

/** An `EuiFilePicker` that reads the selected image or PDF into a `media` item and previews images. */
export const MediaFilePicker = ({
  label,
  helpText,
  accept,
  onChange,
  isDisabled = false,
  'data-test-subj': dataTestSubj,
}: MediaFilePickerProps) => {
  const [error, setError] = useState<string | undefined>();
  const [preview, setPreview] = useState<string | undefined>();
  const [pdfName, setPdfName] = useState<string | undefined>();

  const handleChange = useCallback<NonNullable<EuiFilePickerProps['onChange']>>(
    async (files) => {
      const file = files?.[0];
      setError(undefined);
      setPreview(undefined);
      setPdfName(undefined);
      if (!file) {
        onChange(undefined);
        return;
      }
      try {
        const media = await readMediaFile(file);
        setPreview(media.type === 'image' ? media.value : undefined);
        setPdfName(media.type === 'pdf' ? file.name : undefined);
        onChange(media);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        onChange(undefined);
      }
    },
    [onChange]
  );

  return (
    <>
      <EuiFormRow
        label={label}
        helpText={error === undefined ? helpText : undefined}
        isInvalid={error !== undefined}
        error={error}
        fullWidth
      >
        <EuiFilePicker
          fullWidth
          compressed
          display="default"
          accept={accept}
          onChange={handleChange}
          disabled={isDisabled}
          isInvalid={error !== undefined}
          data-test-subj={dataTestSubj}
          aria-label={label}
        />
      </EuiFormRow>
      {preview && (
        <>
          <EuiSpacer size="s" />
          <EuiImage
            src={preview}
            alt={previewAlt}
            size="s"
            hasShadow
            data-test-subj={`${dataTestSubj}-preview`}
          />
        </>
      )}
      {pdfName && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" data-test-subj={`${dataTestSubj}-pdf`}>
            <EuiIcon type="document" aria-hidden={true} /> {pdfReadyLabel(pdfName)}
          </EuiText>
        </>
      )}
    </>
  );
};
