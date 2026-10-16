/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  BoostState,
  DataStreamsWindowId,
  IndicesPresetId,
  SimpleModeDefaults,
} from '../../common/types';
import { useBoostServices } from '../hooks/use_boost_services';
import { useUpdateSimpleDefaults } from '../hooks/use_boost_state';
import { PROVISIONING_NOTE } from '../translations';

/**
 * Unsaved changes to the simple-mode defaults, kept by the page so switching to advanced mode can
 * offer to save them first.
 */
export const useSimpleModeDraft = (savedDefaults: SimpleModeDefaults | undefined) => {
  const { notifications } = useBoostServices();
  const { mutate: saveDefaults, isLoading: isSaving } = useUpdateSimpleDefaults();
  const [edits, setEdits] = useState<SimpleModeDefaults>();

  // Saved defaults change after a save or a reset, so the draft follows them.
  useEffect(() => setEdits(undefined), [savedDefaults]);

  const draft = edits ?? savedDefaults;
  // How many of the settings differ from what's saved.
  const changeCount =
    edits && savedDefaults
      ? Number(edits.indices !== savedDefaults.indices) +
        Number(edits.data_streams.window !== savedDefaults.data_streams.window)
      : 0;

  return {
    /** The defaults as edited, or as saved when nothing has changed. */
    draft,
    changeCount,
    isDirty: changeCount > 0,
    isSaving,
    setIndices: (indices: IndicesPresetId) => {
      if (draft) {
        setEdits({ ...draft, indices });
      }
    },
    setDataStreamsWindow: (window: DataStreamsWindowId) => {
      if (draft) {
        setEdits({ ...draft, data_streams: { window } });
      }
    },
    discard: () => setEdits(undefined),
    /** Saves the draft, then calls `onSaved` with the state it saved. */
    save: (onSaved?: (state: BoostState) => void) => {
      if (!draft) {
        return;
      }
      saveDefaults(draft, {
        onSuccess: (state) => {
          notifications.toasts.addSuccess({
            title: i18n.translate('xpack.boost.simpleMode.savedToast', {
              defaultMessage: 'Boost defaults saved',
            }),
            text: PROVISIONING_NOTE,
          });
          onSaved?.(state);
        },
      });
    },
  };
};

export type SimpleModeDraft = ReturnType<typeof useSimpleModeDraft>;
