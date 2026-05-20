import type { Logger, LogMeta } from '@kbn/core/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import type { CaptureResult } from '..';
import { PLUGIN_ID } from '../../../common';
import type { ElementPosition } from '../get_element_position_data';
export declare enum Actions {
    OPEN_URL = "open-url",
    GET_ELEMENT_POSITION_DATA = "get-element-position-data",
    GET_NUMBER_OF_ITEMS = "get-number-of-items",
    GET_RENDER_ERRORS = "get-render-errors",
    GET_TIMERANGE = "get-timerange",
    INJECT_CSS = "inject-css",
    REPOSITION = "position-elements",
    WAIT_RENDER = "wait-for-render",
    WAIT_VISUALIZATIONS = "wait-for-visualizations",
    GET_SCREENSHOT = "get-screenshots",
    PRINT_A4_PDF = "print-a4-pdf",
    ADD_IMAGE = "add-pdf-image",
    COMPILE = "compile-pdf"
}
export declare enum Transactions {
    SCREENSHOTTING = "screenshot-pipeline",
    PDF = "generate-pdf"
}
export type SpanTypes = 'setup' | 'read' | 'wait' | 'correction' | 'output';
export interface ScreenshottingAction extends LogMeta {
    event?: {
        duration?: number;
        provider: typeof PLUGIN_ID;
    };
    message: string;
    kibana: {
        screenshotting: {
            action: Actions | Transactions;
            session_id: string;
            cpu?: number;
            cpu_percentage?: number;
            memory?: number;
            memory_mb?: number;
            items_count?: number;
            pixels?: number;
            byte_length?: number;
            element_positions?: number;
            render_errors?: number;
            byte_length_pdf?: number;
            pdf_pages?: number;
        };
    };
}
interface ErrorAction {
    message: string;
    code?: string;
    stack_trace?: string;
    type?: string;
}
type SimpleEvent = Omit<ScreenshottingAction['kibana']['screenshotting'], 'session_id'>;
type Labels = Record<keyof SimpleEvent, number | undefined>;
type LogEndFn = (metricData?: Partial<SimpleEvent>) => void;
/**
 * A class to use internal state properties to log timing between actions in the screenshotting pipeline
 */
export declare class EventLogger {
    private readonly logger;
    private readonly config;
    private spans;
    private transactions;
    private sessionId;
    private logEvent;
    private timings;
    constructor(logger: Logger, config: ConfigType);
    private startTiming;
    /**
     * @returns Logger - original logger
     */
    get kbnLogger(): Logger;
    /**
     * Wraps work in both an APM transaction and an OTel span with active context.
     * The callback receives a setLabels function to set attributes on both APM and OTel before the transaction ends.
     * withActiveSpan keeps the OTel context active so sub-spans (from log() or auto-instrumentation) are parented correctly.
     */
    withTransaction<T>(action: Transactions.SCREENSHOTTING | Transactions.PDF, fn: (setLabels: (labels: Partial<Labels>) => void) => T): T;
    /**
     * General event logging function
     *
     * @param {string} message
     * @param {Actions} action - action type for kibana.screenshotting.action
     * @param {TransactionType} transaction - name of the internal APM transaction in which to associate the span
     * @param {SpanTypes} type - identifier of the span type
     * @param {metricsPre} type - optional metrics to add to the "start" log of the event
     * @returns {LogEndFn} - function to log the end of the span
     */
    log(message: string, action: Actions, type: SpanTypes, metricsPre: Partial<SimpleEvent> | undefined, transaction: Transactions): LogEndFn;
    /**
     * Logging helper for screenshotting events
     */
    logScreenshottingEvent(message: string, action: Actions, type: SpanTypes, metricsPre?: Partial<SimpleEvent>): LogEndFn;
    /**
     * Logging helper for screenshotting events
     */
    logPdfEvent(message: string, action: Actions, type: SpanTypes, metricsPre?: Partial<SimpleEvent>): LogEndFn;
    /**
     * Helper function to calculate the byte length of a set of captured PNG images
     */
    getByteLengthFromCaptureResults(results: CaptureResult['results']): Pick<SimpleEvent, 'byte_length'>;
    /**
     * Helper function to create the "metricPre" data needed to log the start
     * of a screenshot capture event.
     */
    getPixelsFromElementPosition(elementPosition: ElementPosition): Pick<SimpleEvent, 'pixels'>;
    /**
     * General error logger
     *
     * @param {ErrorAction} error: The error object that was caught
     * @param {Actions} action: The screenshotting action type
     * @returns void
     */
    error(error: ErrorAction | string, action: Actions | Transactions): void;
}
export {};
