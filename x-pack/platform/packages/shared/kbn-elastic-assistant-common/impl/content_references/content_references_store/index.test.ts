import { contentReferencesStoreFactory, pruneContentReferences } from "."
import { alertsPageReferenceFactory } from "../references"
import { contentReferenceBlock, contentReferenceString } from "../references/utils"
import { ContentReferencesStore } from "../types"

describe('contentReferencesStoreFactory', () => {
    let contentReferencesStore: ContentReferencesStore
    beforeEach(() => {
        contentReferencesStore = contentReferencesStoreFactory()
    })

    it("adds multiple content reference", async () => {

        const alertsPageReference1 = contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))
        const alertsPageReference2 = contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))
        const alertsPageReference3 = contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))

        const store = contentReferencesStore.getStore()

        const keys = Object.keys(store)

        expect(keys.length).toEqual(3)
        expect(store[alertsPageReference1.id]).toEqual(alertsPageReference1)
        expect(store[alertsPageReference2.id]).toEqual(alertsPageReference2)
        expect(store[alertsPageReference3.id]).toEqual(alertsPageReference3)
    })

    it("referenceIds are unique", async () => {
        const numberOfReferencesToCreate = 50;

        const referenceIds = new Set([...new Array(numberOfReferencesToCreate)]
            .map(() => contentReferencesStore.add(p => alertsPageReferenceFactory(p.id)))
            .map(alertsPageReference => alertsPageReference.id))

        const store = contentReferencesStore.getStore()
        const keys = Object.keys(store)

        expect(referenceIds.size).toEqual(numberOfReferencesToCreate)
        expect(keys.length).toEqual(numberOfReferencesToCreate)
    })
})


describe('pruneContentReferences', () => {
    let contentReferencesStore: ContentReferencesStore
    beforeEach(() => {
        contentReferencesStore = contentReferencesStoreFactory()
    })

    it("prunes content references correctly", async () => {

        const alertsPageReference1 = contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))
        const alertsPageReference2 = contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))
        contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))

        const content = `Example ${contentReferenceBlock(alertsPageReference1)} example ${contentReferenceBlock(alertsPageReference2)}`

        const prunedContentReferences = pruneContentReferences(content, contentReferencesStore)

        const keys = Object.keys(prunedContentReferences!)
        expect(keys.sort()).toEqual([alertsPageReference1.id, alertsPageReference2.id].sort())
    })
})