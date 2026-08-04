import type { ImportFactoryOptions } from '@kbn/file-upload-common';
import { MessageImporter } from './message_importer';
import { NdjsonImporter } from './ndjson_importer';
import { TikaImporter } from './tika_importer';
export declare function importerFactory(format: string, options: ImportFactoryOptions): MessageImporter | NdjsonImporter | TikaImporter;
