/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from '@kbn/core/public';
import type { ComponentType, RefObject } from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import type { SetupWizardStepRules } from '../../../utils/setup_wizard_view';

export interface SetupWizardStepTexts {
  /** Short name in the steps bar. */
  readonly stepTitle: string;
  /** Heading of the step's panel. */
  readonly title: string;
  readonly description: string;
  readonly docsLinkLabel: string;
}

/** Everything about one wizard step. The wizard shell knows no step by name. */
export interface SetupWizardStep extends SetupWizardStepRules {
  readonly texts: SetupWizardStepTexts;
  readonly getDocsLink: (links: DocLinksStart['links']['contextEngine']) => string;
  /** Renders `SetupWizardStepLayout` with the `layout` it gets, and its own body inside. */
  readonly Content: ComponentType<SetupWizardStepContentProps>;
}

/** What the shell gives the step layout. A step passes it on unchanged. */
export interface SetupWizardStepLayoutControls {
  readonly step: SetupWizardStep;
  readonly headingRef: RefObject<HTMLHeadingElement>;
  readonly isDone: boolean;
  readonly isFirstStep: boolean;
  /** No open step comes after this one, so Continue and Skip finish setup. */
  readonly isLastStep: boolean;
  readonly isBusy: boolean;
  readonly onBack: () => void;
  readonly onSkip: () => void;
  readonly onExit: () => void;
  /** Runs `save` when given, then opens the next open step or finishes setup. */
  readonly onContinue: (save?: () => Promise<boolean>) => void;
}

export interface SetupWizardStepContentProps {
  readonly aiIndex: GetAiIndexResponse;
  /** Reloads the AI index after a step saved something. */
  readonly onSaved: () => Promise<unknown>;
  /** For a step that saves on its own, so the shell holds every button meanwhile. */
  readonly onBusyChange: (isBusy: boolean) => void;
  readonly layout: SetupWizardStepLayoutControls;
}
