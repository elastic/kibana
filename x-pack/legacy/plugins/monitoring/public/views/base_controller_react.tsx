/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { kfetch } from 'ui/kfetch';

export default class Base extends React.Component {

  private state = { loading: true };
  private dataPromise: any;


  /* Options:
    - name
    - fetch: string | Promise
  */
  constructor(options) {
    super({});

    if (typeof options.fetch === 'string') {
      this.dataPromise = () => this.fetchData(options.fetch);
    } else {
      this.dataPromise = () => options.fetch();
    }
  }

  public async componentDidMount() {
    console.log('super.componentDidMount()');
    //loading true
    try {
      const response = await this.dataPromise();
      console.log('super.response:', response);
      this.onDataResponse(response);
    } catch (e) {
      console.log('super.error:', e);
      this.onDataFailed(e);
    }
    //loading false
  }

  public componentWillUnmount() {

  }

  public async fetchData(api: string) {


    const data = await kfetch({
      method: 'GET',
      pathname: api,
    });

    this.onDataResponse(data);
  }

  /**
   * abstract: For override only
   * @param response 
   */
  onDataResponse(response) { }

  onDataFailed(error) {

  }

  renderComponent() {
    throw Error('renderComponent needs to return a React component');
    return (<></>);
  }

  enableTimepicker(enable: boolean = true): void {

  }

  render() {
    return this.renderComponent();
  }

} 
