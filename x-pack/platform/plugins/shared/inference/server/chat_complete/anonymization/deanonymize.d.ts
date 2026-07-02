import type { Message, Deanonymization, Anonymization } from '@kbn/inference-common';
export declare function deanonymize<TMessage extends Message>(message: TMessage, anonymizations: Anonymization[]): {
    message: TMessage;
    deanonymizations: Deanonymization[];
};
