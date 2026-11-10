/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { InvestigationClosePreviewResponse } from '../../../../common';

export interface UseSkipCloseConfirmationArgs {
  /** The close preview, or undefined while the first fetch is in flight. */
  preview: InvestigationClosePreviewResponse | undefined;
  /** True when the first preview fetch failed, which the modal reports with a retry button. */
  loadError?: boolean;
  /** Commits the close with no dismiss reason. */
  confirm: () => void;
}

/**
 * Closes an investigation straight away when its pending proposals all waived the discard reason.
 *
 * Nothing is then left to ask: the close records `no_reason` and the confirmation is never shown.
 * Until the preview answers the close counts as skipped too, so a close that needs no
 * confirmation never flashes the modal's loading spinner on its way through. A preview that
 * failed to load is the one case that still needs the modal, which offers the retry.
 */
export const useSkipCloseConfirmation = ({
  preview,
  loadError = false,
  confirm,
}: UseSkipCloseConfirmationArgs): { isSkipped: boolean } => {
  // A ref, not state: the close must fire once per mount even though the preview keeps refetching.
  const started = useRef(false);
  const isSkipped = preview === undefined ? !loadError : !preview.requires_discard_reason;

  useEffect(() => {
    if (preview === undefined || preview.requires_discard_reason || started.current) return;
    started.current = true;
    confirm();
  }, [preview, confirm]);

  return { isSkipped };
};
