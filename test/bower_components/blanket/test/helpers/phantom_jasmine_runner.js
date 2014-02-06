var PhantomJasmineRunner, addReporter, address, page, runner;

PhantomJasmineRunner = (function() {

  function PhantomJasmineRunner(page, exit_func) {
    this.page = page;
    this.exit_func = exit_func != null ? exit_func : phantom.exit;
    this.tries = 0;
    this.max_tries = 10;
  }

  PhantomJasmineRunner.prototype.get_status = function() {
    return this.page.evaluate(function() {
      return window.jasmine_phantom_reporter.status;
    });
  };

  PhantomJasmineRunner.prototype.terminate = function() {
    switch (this.get_status()) {
      case "success":
        return this.exit_func(0);
      case "fail":
        return this.exit_func(1);
      default:
        return this.exit_func(2);
    }
  };

  return PhantomJasmineRunner;

})();

if (phantom.args.length === 0) {
  console.log("Need a url as the argument");
  phantom.exit(1);
}

page = new WebPage();

runner = new PhantomJasmineRunner(page);

page.onConsoleMessage = function(msg) {
  console.log(msg);
  if (msg === "ConsoleReporter finished") {
    return runner.terminate();
  }
};

address = phantom.args[0];



page.open(address, function(status) {
  if (status !== "success") {
    console.log("can't load the address!");
    phantom.exit(1);
  }
  
  
});

