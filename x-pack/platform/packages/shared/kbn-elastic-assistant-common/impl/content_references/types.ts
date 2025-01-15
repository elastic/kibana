import { ContentReference, ContentReferences, Message } from "../schemas"

export type ContentReferenceId = string
export type ContentReferenceTypes = ContentReference['type']
export type ContentReferenceBlock = `{reference(${string})}`

export type ContentReferencesStore = {
    /** 
     * Adds a content reference into the ContentReferencesStore.
     * @param generator A function that returns a new ContentReference.
     * @param generator.params Generator parameters that may be used to generate a new ContentReference.
     * @param generator.params.id An ID that is guaranteed to not exist in the store. Intended to be used as the Id of the ContentReference but not required.
     * @returns the new ContentReference
     */
    add: <T extends ContentReference>(generator: (params: { id: ContentReferenceId }) => T) => T
    
    /**
     * Used to read the content reference store.
     * @returns a record that contains all of the ContentReference that have been added .
     */
    getStore: () => ContentReferences
}