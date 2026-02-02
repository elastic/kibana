/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { FeedbackTriggerButton } from './components';

export { FeedbackHeader } from './components';

export { EmailInput } from './components';
export { EmailConsentCheck } from './components';
export { EmailSection } from './components';
export { CsatButtons } from './components';
export { FeedbackTextArea } from './components';
export { SessionInfoDisclaimer } from './components';
export { FeedbackBody } from './components';

export { CancelButton } from './components';
export { SendFeedbackButton } from './components';
export { FeedbackFooter } from './components';

export { FeedbackContainer } from './components';

export { getUserEmail } from './utils';
export { getCurrentAppTitleAndId } from './utils';
export { canSendTelemetry } from './utils';
export { getQuestions } from './utils';

export { FEEDBACK_SUBMITTED_EVENT_TYPE, feedbackSubmittedEventType } from './telemetry';

export type { FeedbackQuestion, FeedbackSubmittedEventData } from './telemetry';
