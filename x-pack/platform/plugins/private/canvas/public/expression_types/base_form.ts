/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseFormProps {
  name: string;
  displayName?: string;
  help?: string;
}

export class BaseForm {
  name: string;
  displayName: string;
  help: string;

  constructor(props: BaseFormProps) {
    if (!props.name) {
      throw new Error('Expression specs require a name property');
    }

    this.name = props.name;
    this.displayName = props.displayName || this.name;
    this.help = props.help || '';
  }
}
