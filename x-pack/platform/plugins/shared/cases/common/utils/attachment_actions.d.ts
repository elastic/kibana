/**
 * Action types for entries in {@link AttachmentViewObject.getActions}. Lives
 * in `common/` so solutions can reference the enum without pulling the cases
 * public barrel into their page-load bundle.
 */
export declare enum AttachmentActionType {
    BUTTON = "button",
    CUSTOM = "custom"
}
