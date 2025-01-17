import { pruneContentReferences } from "./prune_content_references"
import { alertsPageReferenceFactory } from "../references"
import { contentReferenceBlock } from "../references/utils"
import { ContentReferencesStore } from "../types"
import { contentReferencesStoreFactory } from "./content_references_store_factory"

describe('pruneContentReferences', () => {
    let contentReferencesStore: ContentReferencesStore
    beforeEach(() => {
        contentReferencesStore = contentReferencesStoreFactory()
    })

    it("prunes content references correctly", async () => {

        const alertsPageReference1 = contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))
        const alertsPageReference2 = contentReferencesStore.add(p => alertsPageReferenceFactory(p.id))
        contentReferencesStore.add(p => alertsPageReferenceFactory(p.id)) // this one should get pruned

        const content = `Example ${contentReferenceBlock(alertsPageReference1)} example ${contentReferenceBlock(alertsPageReference2)}`

        const prunedContentReferences = pruneContentReferences(content, contentReferencesStore)

        const keys = Object.keys(prunedContentReferences!)
        expect(keys.sort()).toEqual([alertsPageReference1.id, alertsPageReference2.id].sort())
    })
})