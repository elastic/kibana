# React Style Guide

### Prefer Stateless functional components where possible.
Stateless function components are more concise, and there are plans for react to increase performance of them.
Good:
```
export function KuiButton(props) {
  return <button className="kuiButton" {...props} />
};
```
Bad:
```
export class KuiButton extends React.Component {
  render() {
    return <button className="kuiButton" {...this.props} />
  }
}
```
### Prefer reactDirective over react-component
When using ngReact to embed your react components inside angular html, prefer
reactDirective over react-component. You can read more about these two ngReact methods [here](https://github.com/ngReact/ngReact#features).
Using `react-component` means adding a bunch of components into angular, while `reactDirective` keeps them isolated,
and is also a more succinct syntax.

Good:
```
<hello-component fname="person.fname" lname="person.lname" watch-depth="reference"></hello-component>
```
Bad:
```
<react-component name="HelloComponent" props="person" watch-depth="reference" />
```

### Action function names and prop function names

Name action functions in the form of a strong verb and passed properties in the form of on<Subject><Change>. E.g:
```
<sort-button onClick={action.sort}/>
<pagerButton onPageNext={action.turnToNextPage} />
```

### Avoid creating a function and passing that as a property, in render functions.
Best (relies on [stage 2 proposal](https://github.com/tc39/proposal-class-public-fields)):
```
export class ClickCounter extends React.Component {
  state = { clickCount: 0 };

  // This syntax ensures `this` is bound within handleClick
  onClick = () => {
    this.setState(prevState => { clickCount: prevState.clickCount + 1 });
  }

  render() {
    return <button className="kuiButton" onClick={this.onClick} />
  }
}
```
Good:
```
export class ClickCounter extends React.Component {
  constructor() {
    this.state = { clickCount: 0 };
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.setState(prevState => { clickCount: prevState.clickCount + 1 });
  }

  render() {
    return <button className="kuiButton" onClick={this.onClick} />
  }
}
```

Bad:
```
export class ClickCounter extends React.Component {
  state = { clickCount: 0 };

  onClick() {
    this.setState(prevState => { clickCount: prevState.clickCount + 1 });
  }

  render() {
    return <button className="kuiButton" onClick={() => this.onClick()} />
  }
}
```

Also Bad:
```
  render() {
    return <button className="kuiButton" onClick={this.onClick.bind(this)} />
  }
```

Background: https://facebook.github.io/react/docs/handling-events.html
There is also an eslint rule we should be able to turn on for this.

### Prefer primitives over objects when storing in state.
Good:
```
this.setState({
  currentPage: 0,
  selectedIds: []
});
```

Discouraged:
```
this.setState({
  pager: new Pager(),
  selectedIds: new SelectedIds()
});
```

### Favor spread operators
```
render() {
  return <button className="kuiButton" {...this.props} />
}
```
```
export function Button({ className, ...rest }) {
  const classNames = classNames('KuiButton', className);
  return <button className={classNames} {...rest} />
};
```

## General Guidelines
### Prefer pure functions when possible
Pure functions are easier to understand. We don't want to have to think about side effects or mutated state. When invoking a pure function, all we have to think about is what goes in and what comes out.
