/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { EuiButtonEmpty, EuiCode, EuiSpacer } from '@elastic/eui';
import { KbnSuccessCallout } from '@kbn/ui-callout';

import type { PackagePolicy } from '../../../common/types';
import { useEmbeddedContext } from '../../hooks/use_embedded_context';

import { ConfigureDataStreamsForm } from './configure_data_streams_form';

/**
 * PoC route content: the new form inside the modal. Back goes to the catalogue through the memory
 * history, Cancel and Done close the modal through the embedded context. Nothing here touches the
 * host's URL.
 */
export const OnboardingPocView: React.FC = () => {
  const { packageName } = useParams<{ packageName: string }>();
  const history = useHistory();
  const { onClose } = useEmbeddedContext();
  const [created, setCreated] = useState<PackagePolicy | undefined>();

  const close = useCallback(() => onClose?.(), [onClose]);

  return (
    <>
      <EuiButtonEmpty iconType="chevronSingleLeft" size="xs" onClick={() => history.goBack()}>
        Back to catalogue
      </EuiButtonEmpty>
      <EuiSpacer size="s" />
      {created ? (
        <KbnSuccessCallout
          announceOnMount
          title="Integration policy created"
          text={
            <p>
              Package policy <EuiCode>{created.id}</EuiCode> ({created.name}) on agent policy{' '}
              <EuiCode>{(created.policy_ids ?? []).join(', ')}</EuiCode>.
            </p>
          }
          actionProps={{
            primary: {
              children: 'Done',
              onClick: close,
              'data-test-subj': 'onboardingPocDone',
            },
          }}
        />
      ) : (
        <ConfigureDataStreamsForm
          packageName={packageName}
          onCreated={setCreated}
          onCancel={close}
        />
      )}
    </>
  );
};
