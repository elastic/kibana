import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
/**
 * We will use the savedObject.id as the template identifier when
 * creating SLOs from templates (create?fromTemplateId=xxxx), so no need to have a separate field
 * in the attributes like we have for SLOs.
 */
export declare const sloTemplate: SavedObjectsType;
