import { alertConvo, conversationWithContentReferences } from '@kbn/elastic-assistant/impl/mock/conversation';
import { Conversation } from '../../../..';
import { conversationContainsContentReferences, conversationContainsAnonymizedValues } from '.';


describe('conversation utils', () => {
  
    it.each([
        [undefined, false],
        [conversationWithContentReferences, true],
        [alertConvo, false],
    ])('conversationContainsContentReferences', (conversation: Conversation|undefined, expected: boolean) => {
        expect(conversationContainsContentReferences(conversation)).toBe(expected);
    })

    it.each([
        [undefined, false],
        [conversationWithContentReferences, false],
        [alertConvo, true],
    ])('conversationContainsAnonymizedValues', (conversation: Conversation|undefined, expected: boolean) => {
        expect(conversationContainsAnonymizedValues(conversation)).toBe(expected);
    })

});
  