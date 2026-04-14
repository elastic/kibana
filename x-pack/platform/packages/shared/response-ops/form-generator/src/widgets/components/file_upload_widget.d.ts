import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';
type FileUploadWidgetProps = BaseWidgetProps<z.ZodString, Record<string, unknown>>;
/**
 * File upload widget that reads a file as text and stores the contents in a string field.
 * Useful for service account JSON keys, PEM certificates, and similar text-based credentials.
 */
export declare const FileUploadWidget: React.FC<FileUploadWidgetProps>;
export {};
