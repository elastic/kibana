import { ContentReference, ContentReferences } from "../../schemas"
import { customAlphabet } from 'nanoid'
import { ContentReferencesStore } from "../types"

const CONTENT_REFERENCE_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Creates a new ContentReferencesStore used for storing references (also known as citations)
 */
export const contentReferencesStoreFactory: () => ContentReferencesStore = () => {
    const store = new Map<string, ContentReference>()
    const nanoid = customAlphabet(CONTENT_REFERENCE_ID_ALPHABET, 5)

    const add: ContentReferencesStore['add'] = (creator) => {
        const entry = creator({ id: generateId() })
        store.set(entry.id, entry)
        return entry
    }

    const getStore: ContentReferencesStore['getStore'] = () => {
        return Object.fromEntries(store)
    }

    const generateId = (size = 5) => {
        const id = nanoid(size)
        if (store.has(id)) {
            return generateId(size + 1)
        }
        return id
    }

    return {
        add,
        getStore
    }
}

/**
 * Returnes a pruned copy of the ContentReferencesStore.
 * @param content The content that may contain references to data within the ContentReferencesStore.
 * @param contentReferencesStore The ContentReferencesStore contain the contentReferences.
 * @returns a new record only containing the ContentReferences that are referenced to by the content.
 */
export const prunedContentReferences = (content: string, contentReferencesStore: ContentReferencesStore): ContentReferences | undefined => {
    const fullStore = contentReferencesStore.getStore()
    const prunedStore: Record<string, ContentReference> = {}
    const matches = content.matchAll(/\!\{reference\([0-9a-zA-Z]+\)\}/g)
    let isPrunedStoreEmpty = true

    for (const match of matches) {
        const referenceElement = match[0]
        const referenceId = referenceElement.replace("!{reference(", "").replace(")}", "")
        if (referenceId in prunedStore) {
            continue
        }
        const contentReference = fullStore[referenceId]
        if (contentReference) {
            isPrunedStoreEmpty = false
            prunedStore[referenceId] = contentReference
        }
    }

    if(isPrunedStoreEmpty){
        return undefined
    }

    return prunedStore
}