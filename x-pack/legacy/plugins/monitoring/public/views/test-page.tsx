import Base from './base_controller_react';
import React from 'react';

export default class TestPage extends Base {

  constructor() {

    const testData = new Promise((resolve, reject) => {
      return setTimeout(() => {

        const fakeData = [
          { value: 1 },
          { value: 2 },
          { value: 3 },
          { value: 4 },
          { value: 5 },
          { value: 6 }
        ];

        return resolve(fakeData);

      }, 1000);
    });

    testData.then((data)=>{
      console.log('CHILD > data:', data);
    })

    super({ fetch: testData });


  }

  onDataResponse(data) {
    console.log('...DATA:', data);
  }


  renderComponent() {
    return (<h1>NICE!!!!</h1>);
  }

}