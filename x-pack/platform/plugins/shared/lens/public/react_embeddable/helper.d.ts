import { type EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import type { GeneralDatasourceStates, LensRuntimeState, LensSerializedState, StructuredDatasourceStates } from '@kbn/lens-common';
import type { LensSerializedAPIConfig, LensWireAPIConfig } from '@kbn/lens-common-2';
import type { ViewMode } from '@kbn/presentation-publishing';
import { type PublishingSubject } from '@kbn/presentation-publishing';
import type { StrippedLensState } from '../../common/transforms/helpers';
import type { ESQLStartServices } from './esql';
import type { LensEmbeddableStartServices } from './types';
import type { FlattenedLensByValuePanelSchema } from '../../server/types';
export declare function createEmptyLensState(visualizationType?: null | string, title?: LensSerializedState['title'], description?: LensSerializedState['description'], query?: LensSerializedState['query'], filters?: LensSerializedState['filters']): LensRuntimeState;
/**
 * Shared logic to ensure the attributes are correctly loaded
 * Make sure to inject references from the container down to the runtime state
 * this ensure migrations/copy to spaces works correctly
 **/
export declare function deserializeState({ attributeService, ...services }: Pick<LensEmbeddableStartServices, 'attributeService'> & ESQLStartServices, rawState: LensWireAPIConfig): Promise<LensRuntimeState>;
export declare function isTextBasedLanguage(state: LensRuntimeState): boolean;
export declare function getViewMode(api: unknown): ViewMode | undefined;
export declare function getRenderMode(api: unknown): RenderMode;
export declare function getParentContext(parentApi: unknown): import("@kbn/core/server").KibanaExecutionContext | undefined;
export declare function extractInheritedViewModeObservable(parentApi?: unknown): PublishingSubject<ViewMode>;
export declare function getStructuredDatasourceStates(datasourceStates?: Readonly<GeneralDatasourceStates>): StructuredDatasourceStates;
export declare function transformFromApiConfig(rawState: LensWireAPIConfig | FlattenedLensByValuePanelSchema): LensSerializedState;
/**
 * !Important! call stripInheritedContext before transforming to API config
 */
export declare function transformToApiConfig(state: StrippedLensState): LensSerializedAPIConfig;
export declare function hasAnnotationGroupReference(state: LensRuntimeState, groupId: string): boolean;
/**
 * Returns updated state with library annotation group data for all by-reference
 * annotation layers that reference the given group ID, or undefined if no layers matched.
 *
 * Handles both hydrated layers (annotationGroupId on the layer) and persisted layers
 * (annotationGroupRef resolved via the references array).
 */
export declare function updateAttributesWithAnnotation(state: LensRuntimeState, groupId: string, libraryGroup: EventAnnotationGroupConfig): LensRuntimeState | undefined;
/**
 * Saves all modified linked (by-reference) annotation layers to the library.
 * Each layer with local changes is committed via `updateAnnotationGroup`, which
 * also fires `annotationGroupUpdated$` to notify other panels.
 *
 * Returns an immutably-updated viz state with `__lastSaved` synced on each
 * saved layer, so serialization produces clean by-reference layers rather than
 * "linked with local changes" layers.
 */
export declare function saveUpdatedLinkedAnnotationsToLibrary(vizState: unknown, eventAnnotationService: EventAnnotationServiceType): Promise<unknown>;
