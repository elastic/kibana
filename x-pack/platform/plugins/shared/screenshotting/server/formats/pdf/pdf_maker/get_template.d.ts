import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { TemplateLayout } from './types';
export declare function getTemplate(layout: TemplateLayout, logo: string | undefined, title: string, tableBorderWidth: number, assetPath: string): Partial<TDocumentDefinitions>;
