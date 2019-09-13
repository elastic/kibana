@REM Remember this is a batch file
echo on
time /t
cd C:\vagrant\qa


echo "****** NOTE: you won't see any output until the provisioning is complete (or fails)."
echo "****** You can `tail -f qa/install.log` in another shell if you want to watch progress."
C:\PROGRA~1\Git\git-bash.exe start.sh
time /t
echo "Done"
echo "phase1.sh should have created phase1.marker file, else, we should return an error status"
type phase1.marker
