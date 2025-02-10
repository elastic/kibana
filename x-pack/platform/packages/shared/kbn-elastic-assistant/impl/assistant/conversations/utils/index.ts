import { isEmpty } from 'lodash';
import { Conversation } from '../../../..';

export const conversationContainsContentReferences = (conversation?: Conversation): boolean => {
    return conversation?.messages.some(message => !isEmpty(message.metadata?.contentReferences)) ?? false
}

/** Checks if the conversations has replacements, not if the replacements are actually used */
export const conversationContainsAnonymizedValues = (conversation?: Conversation): boolean => {
    return !isEmpty(conversation?.replacements)
}