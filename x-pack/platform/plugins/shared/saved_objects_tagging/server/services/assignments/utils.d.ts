import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import type { AssignableObject } from '../../../common/assignments';
export declare const toAssignableObject: (object: SavedObject, typeDef: SavedObjectsType) => AssignableObject;
