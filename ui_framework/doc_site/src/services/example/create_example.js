import {
  GuideExample,
} from '../../components';

export default function creatExample(examples) {
  class Example extends GuideExample {
    constructor(props) {
      super(props, examples);
    }
  }

  Example.propTypes = Object.assign({}, GuideExample.propTypes);

  return Example;
}
