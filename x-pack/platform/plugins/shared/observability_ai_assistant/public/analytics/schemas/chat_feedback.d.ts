import type { EventTypeOpts } from '@kbn/core/public';
import type { Conversation } from '../../../common';
import type { Feedback } from '../../components/buttons/feedback_buttons';
import { type Connector, type Scope } from '../../../common/analytics';
export interface ChatFeedback extends Connector, Scope {
    feedback: Feedback;
    conversation: Omit<Omit<Conversation, 'messages' | 'systemMessage'>, 'conversation'> & {
        conversation: Omit<Conversation['conversation'], 'title'>;
    };
}
export declare const chatFeedbackEventSchema: EventTypeOpts<ChatFeedback>;
