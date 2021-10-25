[1mdiff --git a/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/utils.ts b/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/utils.ts[m
[1mindex bfb1ac048e2..4e5439aeb45 100644[m
[1m--- a/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/utils.ts[m
[1m+++ b/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/utils.ts[m
[36m@@ -31,11 +31,20 @@[m [mexport function createEmptyHostIsolationException(): CreateExceptionListItemSche[m
   };[m
 }[m
 [m
[32m+[m[32m/**[m
[32m+[m[32m * Validates that an IP is a valid ipv4 or CIDR.[m
[32m+[m[32m * The initial regex validates the format for x.x.x.x/xx[m
[32m+[m[32m * Then ipaddr is used for better ipv4 validation[m
[32m+[m[32m */[m
 export function isValidIPv4OrCIDR(maybeIp: string): boolean {[m
[31m-  try {[m
[31m-    ipaddr.IPv4.parseCIDR(maybeIp);[m
[31m-    return true;[m
[31m-  } catch (e) {[m
[31m-    return ipaddr.IPv4.isValid(maybeIp);[m
[32m+[m[32m  const ipv4re = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;[m
[32m+[m[32m  if (ipv4re.test(maybeIp)) {[m
[32m+[m[32m    try {[m
[32m+[m[32m      ipaddr.IPv4.parseCIDR(maybeIp);[m
[32m+[m[32m      return true;[m
[32m+[m[32m    } catch (e) {[m
[32m+[m[32m      return ipaddr.IPv4.isValid(maybeIp);[m
[32m+[m[32m    }[m
   }[m
[32m+[m[32m  return false;[m
 }[m
[1mdiff --git a/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/view/components/form.test.tsx b/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/view/components/form.test.tsx[m
[1mindex 826f7bf6c4d..32fe1ebf3da 100644[m
[1m--- a/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/view/components/form.test.tsx[m
[1m+++ b/x-pack/plugins/security_solution/public/management/pages/host_isolation_exceptions/view/components/form.test.tsx[m
[36m@@ -51,11 +51,15 @@[m [mdescribe('When on the host isolation exceptions add entry form', () => {[m
         renderResult.getByTestId('hostIsolationExceptions-form-description-input')[m
       ).toHaveValue('');[m
     });[m
[31m-    it('should call onError with true when a wrong ip value is introduced', () => {[m
[31m-      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');[m
[31m-      userEvent.type(ipInput, 'not an ip');[m
[31m-      expect(onError).toHaveBeenCalledWith(true);[m
[31m-    });[m
[32m+[m[32m    it.each(['not an ip', '100', '900.0.0.1', 'x.x.x.x', '10.0.0'])([m
[32m+[m[32m      'should call onError with true when a wrong ip value is introduced. Case: "%s"',[m
[32m+[m[32m      (value: string) => {[m
[32m+[m[32m        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');[m
[32m+[m[32m        userEvent.type(ipInput, value);[m
[32m+[m[32m        expect(onError).toHaveBeenCalledWith(true);[m
[32m+[m[32m      }[m
[32m+[m[32m    );[m
[32m+[m
     it('should call onError with false when a correct values are introduced', () => {[m
       const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');[m
       const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');[m
