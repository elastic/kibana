export declare function getSpaceAwareSaveobjectsClients(spaceId?: string): {
    savedObjectClientWithSpace: import("@kbn/core/server").SavedObjectsClientContract;
    savedObjectsImporter: import("@kbn/core/server").ISavedObjectsImporter;
    savedObjectTagAssignmentService: import("@kbn/saved-objects-tagging-plugin/server").IAssignmentService;
    savedObjectTagClient: import("@kbn/saved-objects-tagging-oss-plugin/common").ITagsClient;
};
