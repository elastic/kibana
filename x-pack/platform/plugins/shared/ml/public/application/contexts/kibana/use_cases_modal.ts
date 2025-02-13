/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { stringHash } from '@kbn/ml-string-hash';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from './kibana_context';
import type { MappedEmbeddableTypeOf, MlEmbeddableTypes } from '../../../embeddables';

/**
 * Returns a callback for opening the cases modal with provided attachment state.
 */
export const useCasesModal = <EmbeddableType extends MlEmbeddableTypes>(
  embeddableType: EmbeddableType,
  title: string
) => {
  const {
    services: { cases },
  } = useMlKibana();

  const successMessage = useMemo(() => {
    return i18n.translate('xpack.ml.useCasesModal.successMessage', {
      defaultMessage: '{title} added to case.',
      values: { title },
    });
  }, [title]);

  const selectCaseModal = cases?.hooks.useCasesAddToExistingCaseModal({
    successToaster: {
      content: successMessage,
    },
  });

  return useCallback(
    (persistableState: Partial<Omit<MappedEmbeddableTypeOf<EmbeddableType>, 'id'>>) => {
      const persistableStateAttachmentState = {
        ...persistableState,
        // Creates unique id based on the input
        id: stringHash(JSON.stringify(persistableState)).toString(),
      };

      if (!selectCaseModal) {
        throw new Error('Cases modal is not available');
      }

      selectCaseModal.open({
        getAttachments: () => [
          {
            type: AttachmentType.persistableState,
            persistableStateAttachmentTypeId: embeddableType,
            // TODO Cases: improve type for persistableStateAttachmentState with io-ts
            persistableStateAttachmentState: JSON.parse(
              JSON.stringify(persistableStateAttachmentState)
            ),
          },
        ],
      });
    },

    [embeddableType, selectCaseModal]
  );
};
