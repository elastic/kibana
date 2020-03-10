/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IField, AbstractField } from './field';

export class KibanaRegionField extends AbstractField implements IField {
  static type = 'KIBANA_REGION';

  private readonly _source: IEmsFileSource;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IEmsFileSource;
    origin: FIELD_ORIGIN;
  }) {
    super({ fieldName, origin });
    this._source = source;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getLabel(): Promise<string> {
    const meta = await this._source.getVectorFileMeta();
    // TODO remove any and @ts-ignore when vectorFileMeta type defined
    // @ts-ignore
    const field: any = meta.fields.find(f => f.name === this._fieldName);
    return field ? field.description : this._fieldName;
  }
}
