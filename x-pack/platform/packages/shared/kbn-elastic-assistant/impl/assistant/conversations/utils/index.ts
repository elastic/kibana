import { isEmpty } from 'lodash';
import { Conversation } from '../../../..';

export const conversationContainsContentReferences = (conversation?: Conversation): boolean => {
    return conversation?.messages.some(message => !isEmpty(message.metadata?.contentReferences)) ?? false
}

export const conversationContainsAnonymizedValues = (conversation?: Conversation): boolean => {
    return !isEmpty(conversation?.replacements)
}