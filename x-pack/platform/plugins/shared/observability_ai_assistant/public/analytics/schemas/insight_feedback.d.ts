import type { EventTypeOpts } from '@kbn/core/public';
import type { Feedback } from '../../components/buttons/feedback_buttons';
import { type Connector, type Scope } from '../../../common/analytics';
export interface InsightFeedback extends Connector, Scope {
    feedback: Feedback;
}
export declare const insightFeedbackEventSchema: EventTypeOpts<InsightFeedback>;
