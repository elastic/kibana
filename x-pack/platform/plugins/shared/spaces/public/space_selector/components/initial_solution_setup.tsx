/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';

import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { parseNextURL } from '@kbn/std';

import type { InitialSolutionSetupView } from '../../../common';
import { ENTER_SPACE_PATH } from '../../../common';
import { SOLUTION_VIEW_OPTIONS } from '../../solution_view_options';
import type { SpacesManager } from '../../spaces_manager';

interface Props {
  spacesManager: SpacesManager;
  serverBasePath: string;
}

export const InitialSolutionSetup = ({ spacesManager, serverBasePath }: Props) => {
  const [selectedSolution, setSelectedSolution] = useState<InitialSolutionSetupView>();
  const [error, setError] = useState<Error>();

  const continueToSpace = () => {
    // Match /spaces/enter: validate next without basePath, since Spaces stores app-relative next URLs.
    const parsed = parseNextURL(window.location.href);
    const enterUrl = `${serverBasePath}${ENTER_SPACE_PATH}`;
    window.location.href =
      parsed === '/' ? enterUrl : `${enterUrl}?next=${encodeURIComponent(parsed)}`;
  };

  const completeSetup = async (solution: InitialSolutionSetupView) => {
    setSelectedSolution(solution);
    setError(undefined);

    try {
      await spacesManager.completeInitialSolutionSetup(solution);
      continueToSpace();
    } catch (setupError) {
      if (isHttpFetchError(setupError) && setupError.response?.status === 409) {
        try {
          const { required } = await spacesManager.getInitialSolutionSetup();
          if (!required) {
            continueToSpace();
            return;
          }
        } catch (stateError) {
          setError(stateError as Error);
          setSelectedSolution(undefined);
          return;
        }
      }

      setError(setupError as Error);
      setSelectedSolution(undefined);
    }
  };

  return (
    <>
      <EuiFlexGrid columns={4} gutterSize="l">
        {SOLUTION_VIEW_OPTIONS.map(
          ({ value, initialSetupName, description, icon, dataTestSubj }) => (
            <EuiFlexItem key={value}>
              <EuiCard
                data-test-subj={`initialSolutionSetup-${dataTestSubj}`}
                icon={<EuiIcon type={icon} size="xl" aria-hidden={true} />}
                title={initialSetupName}
                description={description}
                textAlign="center"
                paddingSize="l"
                footer={
                  <EuiButton
                    fullWidth
                    onClick={() => completeSetup(value)}
                    isLoading={selectedSolution === value}
                    isDisabled={selectedSolution !== undefined}
                    aria-label={i18n.translate(
                      'xpack.spaces.spaceSelector.initialSolutionSetup.selectSolutionLabel',
                      {
                        defaultMessage: 'Select {solution}',
                        values: { solution: initialSetupName },
                      }
                    )}
                  >
                    {i18n.translate('xpack.spaces.spaceSelector.initialSolutionSetup.nextButton', {
                      defaultMessage: 'Next',
                    })}
                  </EuiButton>
                }
              />
            </EuiFlexItem>
          )
        )}
      </EuiFlexGrid>
      {error ? (
        <>
          <EuiSpacer />
          <EuiPanel color="danger" data-test-subj="initialSolutionSetupError">
            <EuiText color="danger">{error.message}</EuiText>
          </EuiPanel>
        </>
      ) : null}
    </>
  );
};
