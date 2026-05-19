import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import type { EventLogger } from './event_logger';
export interface AttributesMap {
    [key: string]: string | null;
}
export interface ElementPosition {
    boundingClientRect: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
    scroll: {
        x: number;
        y: number;
    };
}
export interface ElementsPositionAndAttribute {
    position: ElementPosition;
    attributes: AttributesMap;
}
export declare const getElementPositionAndAttributes: (browser: HeadlessChromiumDriver, eventLogger: EventLogger, layout: Layout) => Promise<ElementsPositionAndAttribute[] | null>;
