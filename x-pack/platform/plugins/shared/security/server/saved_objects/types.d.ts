/**
 * The SecurityAction enumeration contains values for all valid shared object
 * security actions. The string for each value correlates to the ES operation.
 */
export declare enum SecurityAction {
    CHECK_CONFLICTS = 0,
    CLOSE_POINT_IN_TIME = 1,
    COLLECT_MULTINAMESPACE_REFERENCES = 2,
    COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES = 3,
    CREATE = 4,
    BULK_CREATE = 5,
    DELETE = 6,
    BULK_DELETE = 7,
    FIND = 8,
    GET = 9,
    BULK_GET = 10,
    INTERNAL_BULK_RESOLVE = 11,
    OPEN_POINT_IN_TIME = 12,
    REMOVE_REFERENCES = 13,
    UPDATE = 14,
    BULK_UPDATE = 15,
    UPDATE_OBJECTS_SPACES = 16,
    CHANGE_OWNERSHIP = 17,
    CHANGE_ACCESS_MODE = 18
}
