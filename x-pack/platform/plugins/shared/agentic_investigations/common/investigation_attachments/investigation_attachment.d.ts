/**
 * Fields every by-reference investigation attachment document stores. Readers start from the
 * hidden index, keyed by space and conversation; the conversation attachment only mirrors it.
 */
export interface StoredInvestigationAttachment {
    spaceId: string;
    conversationId: string;
    /** The document id is the index `_id`, never part of the stored body. */
    _id?: never;
}
/** A stored document together with its `_id`, which is also the attachment id and origin. */
export type InvestigationAttachmentDocument<TStored extends StoredInvestigationAttachment> = TStored & {
    id: string;
};
