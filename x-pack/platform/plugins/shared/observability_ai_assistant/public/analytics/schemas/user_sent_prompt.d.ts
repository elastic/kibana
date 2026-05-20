import type { EventTypeOpts } from '@kbn/core/public';
import { type Connector, type Scope } from '../../../common/analytics';
export interface UserSentPrompt extends Connector, Scope {
}
export declare const userSentPromptEventSchema: EventTypeOpts<UserSentPrompt>;
