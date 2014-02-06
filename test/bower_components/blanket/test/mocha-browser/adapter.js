describe('Test an Object', function() {
	describe('Test a Function', function() {
		it('should return a greeting', function() {
			assert(anObject.aFunction() === 'Hello Blanket');
		});
	});

	describe('Factorial', function() {
		it('should return the factorial of 1', function() {
			assert(anObject.factorial(1) === 1);
		});
	});

});