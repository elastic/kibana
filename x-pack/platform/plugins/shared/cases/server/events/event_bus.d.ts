import { EventEmitter } from 'events';
import type { KibanaRequest } from '@kbn/core/server';
import type { CasesEventPayload, CasesDomainEventType, CaseCreatedEventPayload, CaseUpdatedEventPayload, AttachmentsAddedEventPayload } from './types';
import type { Case } from '../../common';
import type { CaseSavedObjectTransformed } from '../common/types/case';
export declare const CASE_CREATED_EVENT = "caseCreated";
export declare const CASE_UPDATED_EVENT = "caseUpdated";
export declare const ATTACHMENTS_ADDED_EVENT = "attachmentsAdded";
export declare const CASE_STATUS_CHANGED_EVENT = "caseStatusChanged";
interface CaseUpdatedExtraInfo {
    previousCase?: CaseSavedObjectTransformed;
    updatedCase?: Case;
}
export type CasesEventBusListener<TType extends CasesDomainEventType = CasesDomainEventType> = (event: CasesEventPayload<TType>) => void | Promise<void>;
export type CaseUpdatedEventBusListener<TType extends CasesDomainEventType = CasesDomainEventType> = (event: CasesEventPayload<TType>, extraInfo: CaseUpdatedExtraInfo) => void | Promise<void>;
/**
 * Typed internal event bus for Cases domain events.
 * Replaces direct client-to-workflows emission with a single bridge listener.
 */
export declare class CasesEventBus extends EventEmitter {
    constructor();
    emitCaseCreated(request: KibanaRequest, payload: CaseCreatedEventPayload): void;
    emitCaseUpdated(request: KibanaRequest, payload: CaseUpdatedEventPayload, extraInfo: CaseUpdatedExtraInfo): void;
    emitAttachmentsAdded(request: KibanaRequest, payload: AttachmentsAddedEventPayload): void;
    onCaseCreated(listener: CasesEventBusListener<'caseCreated'>): void;
    onCaseUpdated(listener: CaseUpdatedEventBusListener<'caseUpdated'>): void;
    onAttachmentsAdded(listener: CasesEventBusListener<'attachmentsAdded'>): void;
}
export {};
