import type { ImportFactoryOptions } from '@kbn/file-upload-common';
import type { MessageImporter } from './message_importer';
import type { NdjsonImporter } from './ndjson_importer';
import type { TikaImporter } from './tika_importer';
export declare function importerFactory(format: string, options: ImportFactoryOptions): MessageImporter | NdjsonImporter | TikaImporter;
