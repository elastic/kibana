@REM cd to the qa/ dir where this script lives
@REM cd "$( dirname "${BASH_SOURCE[0]}" )"
cd C:\vagrant\qa
@echo on


@echo "Installing the CA root certificate"
certutil -addstore root ..\certs\ca\ca.crt

@echo "Importing IE specific registry keys"
REG IMPORT bf_cache.reg

set BROWSER="internet explorer"

@echo "Installing nircmd in order to change desktop resolution"
choco install -y nircmd
@echo "Changing windows resolution"
C:\ProgramData\chocolatey\lib\nircmd\tools\nircmd.exe setdisplay 1152 864 32 -updatereg -allusers

@REM @echo "Installing Adobe Reader"
@REM AdbeRdr11010_en_US.exe /msi EULA_ACCEPT=YES /qn

choco install -y foxitreader

schtasks /CREATE /SC ONCE /TN selenium /TR "C:\vagrant\qa\start_selenium.bat" /ST 00:00
schtasks /RUN /TN selenium

exit



@echo "Start Selenium Server (git-bash.exe C:\vagrant\qa\start_selenium.sh)"
C:\PROGRA~1\Git\git-bash.exe C:\vagrant\qa\start_selenium.sh