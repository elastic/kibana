/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { FileState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { createUploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { constructFileKindIdByOwner } from '../../../../common/files';
import type { Owner } from '../../../../common/constants/types';
import { deleteFileAttachments } from '../../../containers/api';
import * as i18n from './translations';

export interface TrayFile {
  file: File;
  status: FileState['status'];
  id?: string;
  fileJSON?: FileJSON;
  error?: Error;
}

export interface UseFileTrayReturn {
  /** False when the host has no files context, so the tray can't upload. */
  isEnabled: boolean;
  trayFile: TrayFile | null;
  /** Set when the drop or paste was rejected before upload. */
  trayError: string | null;
  addFiles: (files: File[]) => void;
  removeFile: () => void;
  /** Empties the tray after the file was sent, keeping the uploaded file. */
  reset: () => void;
}

const useOptionalFilesClient = () => {
  try {
    return useFilesContext().client;
  } catch {
    return null;
  }
};

const toTrayFile = ({ file, status, id, fileJSON, error }: FileState): TrayFile => ({
  file,
  status,
  id,
  fileJSON,
  error,
});

/** Holds 1 file for the next message: uploads it on add, deletes it if it's never sent. */
export const useFileTray = ({
  caseId,
  owner,
}: {
  caseId: string;
  owner: Owner | null;
}): UseFileTrayReturn => {
  const client = useOptionalFilesClient();
  const fileKindId = owner ? constructFileKindIdByOwner(owner) : null;

  const uploadState = useMemo(
    () =>
      client && fileKindId
        ? createUploadState({
            client,
            fileKind: client.getFileKind(fileKindId),
            allowRepeatedUploads: false,
          })
        : null,
    [client, fileKindId]
  );

  const [trayFile, setTrayFile] = useState<TrayFile | null>(null);
  const [trayError, setTrayError] = useState<string | null>(null);
  // Uploaded but not sent yet; deleted on remove or unmount.
  const pendingFileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uploadState) return;

    const subscription = uploadState.files$.subscribe((files) => {
      const [first] = files;
      pendingFileIdRef.current = first?.status === 'uploaded' ? first.id ?? null : null;
      setTrayFile(first ? toTrayFile(first) : null);
    });

    return () => {
      subscription.unsubscribe();
      uploadState.dispose();
    };
  }, [uploadState]);

  const deletePendingFile = useCallback(() => {
    const fileId = pendingFileIdRef.current;
    pendingFileIdRef.current = null;
    if (fileId) {
      deleteFileAttachments({ caseId, fileIds: [fileId] }).catch(() => {});
    }
  }, [caseId]);

  useEffect(() => deletePendingFile, [deletePendingFile]);

  const addFiles = useCallback(
    (files: File[]) => {
      if (!uploadState || !owner || files.length === 0) return;

      if (files.length > 1 || uploadState.hasFiles()) {
        setTrayError(i18n.ONE_FILE_PER_MESSAGE);
        return;
      }

      setTrayError(null);
      uploadState.setFiles(files);
      uploadState.upload({ caseIds: [caseId], owner: [owner] });
    },
    [caseId, owner, uploadState]
  );

  const removeFile = useCallback(() => {
    if (!uploadState) return;

    setTrayError(null);
    if (uploadState.isUploading()) {
      // The upload deletes its own file when aborted.
      uploadState.abort();
    }
    deletePendingFile();
    uploadState.clear();
  }, [deletePendingFile, uploadState]);

  const reset = useCallback(() => {
    pendingFileIdRef.current = null;
    setTrayError(null);
    uploadState?.clear();
  }, [uploadState]);

  return {
    isEnabled: uploadState != null,
    trayFile,
    trayError,
    addFiles,
    removeFile,
    reset,
  };
};
