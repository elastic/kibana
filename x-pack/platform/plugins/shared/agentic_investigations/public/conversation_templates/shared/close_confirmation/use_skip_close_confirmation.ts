/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { InvestigationClosePreviewResponse } from '../../../../common';

export interface UseSkipCloseConfirmationArgs {
  /** The close preview, or undefined while the first fetch is in flight. */
  preview: InvestigationClosePreviewResponse | undefined;
  /** True when the first preview fetch failed, which the modal reports with a retry button. */
  loadError?: boolean;
  /**
   * Commits the close with no dismiss reason. Resolves `true` when the close is done (or already
   * reported to the user), and `false` when the user has to look at the confirmation after all —
   * proposals changed under them, or some could not be dismissed.
   */
  confirm: () => Promise<boolean>;
}

/**
 * Closes an investigation straight away when nothing about it needs a decision from the user.
 *
 * A pending proposal only needs one when declining it has to be justified; to-dos do not, so a
 * Nightshift investigation closes on the first click with no second confirmation. The modal is
 * still mounted — and `confirm` is still exercised through it — for the cases this returns
 * `isSkipped: false` for: an investigation with proposals that do need a reason, a preview that
 * failed to load, and a skipped close the server rejected.
 *
 * Until the preview answers, the close counts as skipped: the modal would otherwise flash its
 * loading spinner for every close that turns out to need no confirmation at all.
 */
export const useSkipCloseConfirmation = ({
  preview,
  loadError = false,
  confirm,
}: UseSkipCloseConfirmationArgs): { isSkipped: boolean } => {
  // A ref, not state: the close must fire once per mount even though `preview` keeps refetching.
  const started = useRef(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const skippable = preview !== undefined && !preview.requires_discard_reason;

  useEffect(() => {
    if (!skippable || started.current) return;
    started.current = true;
    void confirm().then((closed) => {
      if (!closed) setNeedsConfirmation(true);
    });
  }, [skippable, confirm]);

  if (preview === undefined) return { isSkipped: !loadError };

  return { isSkipped: skippable && !needsConfirmation };
};
